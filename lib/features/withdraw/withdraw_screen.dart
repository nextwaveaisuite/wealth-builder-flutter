import 'package:flutter/material.dart';

class WithdrawScreen extends StatefulWidget {
  const WithdrawScreen({super.key});
  @override
  State<WithdrawScreen> createState() => _WithdrawScreenState();
}
class _WithdrawScreenState extends State<WithdrawScreen> {
  final _amount = TextEditingController();
  String _plan = '';
  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const Text('Withdraw', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        TextField(decoration: const InputDecoration(labelText: 'Amount (AUD)'), controller: _amount, keyboardType: TextInputType.number),
        const SizedBox(height: 8),
        ElevatedButton(
          onPressed: () {
            final a = double.tryParse(_amount.text.trim()) ?? 0;
            if (a <= 0) return;
            setState(() => _plan = 'Plan: Sell safety sleeve first (VAF/GOLD), respect min trade size.');
          },
          child: const Text('Create Sell Plan'),
        ),
        const SizedBox(height: 12),
        Text(_plan),
      ],
    );
  }
}